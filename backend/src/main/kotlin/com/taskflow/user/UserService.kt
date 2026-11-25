package com.taskflow.user

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class UserService(private val userRepository: UserRepository) {

    fun listUsers(): List<UserResponse> =
        userRepository.findAllByOrderByNameAsc().map(UserResponse::from)
}
